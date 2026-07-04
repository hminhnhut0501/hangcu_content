from __future__ import annotations

import unittest
from unittest.mock import patch

from app.api.endpoints import internal
from app.api.endpoints.accounts import pause_account_api, resume_account_api
from app.services import scheduler_service


class ObservabilitySmokeTests(unittest.TestCase):
    def test_parse_slots_and_schedule_fields(self):
        slots = scheduler_service.parse_slots("09:00;13:30;13:30;25:10;07:05")
        self.assertEqual(slots, ["07:05", "09:00", "13:30"])

        fields = scheduler_service.schedule_fields(True, "09:00,13:30")
        self.assertTrue(fields["schedule_enabled"])
        self.assertEqual(fields["schedule_slots"], "09:00,13:30")
        self.assertEqual(fields["status"], "scheduled")
        self.assertTrue(fields["next_run_at"])

    def test_enqueue_due_work_touches_scheduler_heartbeat(self):
        created = []
        updated = []
        events = []

        with (
            patch.object(scheduler_service, "list_auto_groups", return_value=[{"id": "g1", "auto_slots": "09:00", "auto_pick_count": 1}]),
            patch.object(scheduler_service, "list_group_campaigns", return_value=[{"id": "c1", "topic_id": "t1"}]),
            patch.object(scheduler_service, "list_due_campaigns", return_value=[{"id": "c2", "schedule_slots": "10:00"}]),
            patch.object(scheduler_service, "pick_account_for_job", return_value={"id": "a1"}),
            patch.object(scheduler_service, "insert_row", side_effect=lambda table, payload: {"id": f"{table}-id", **payload}),
            patch.object(scheduler_service, "update_row", side_effect=lambda table, row_id, payload: updated.append((table, row_id, payload))),
            patch.object(scheduler_service, "update_campaign", side_effect=lambda campaign_id, payload: updated.append(("campaign", campaign_id, payload))),
            patch.object(scheduler_service, "create_event", side_effect=lambda *args, **kwargs: events.append((args, kwargs))),
            patch.object(scheduler_service, "upsert_setting", side_effect=lambda key, value: created.append((key, value))),
            patch.object(scheduler_service, "now_iso", return_value="2026-07-04T00:00:00+00:00"),
        ):
            result = scheduler_service.enqueue_due_work()

        self.assertEqual(result["total"], 2)
        self.assertEqual(created[0][0], "scheduler_heartbeat")
        self.assertEqual(created[0][1]["total"], 2)
        self.assertTrue(any(item[0] == "content_groups" for item in updated))
        self.assertTrue(events)

    def test_health_snapshot(self):
        with (
            patch.object(internal, "list_settings", return_value=[
                {"key": "worker_heartbeat", "value": {"status": "busy"}},
                {"key": "scheduler_heartbeat", "value": {"status": "running"}},
            ]),
            patch.object(internal, "count_rows", side_effect=lambda table, filters=None: {"content_groups": 3, "content_topics": 4, "content_campaigns": 5, "tg_accounts": 2, "queue_jobs": 7}.get(table, 0)),
            patch.object(internal, "list_logs", return_value=[1, 2]),
            patch.object(internal, "recent_jobs", return_value=[1]),
        ):
            snapshot = internal.build_health_snapshot()

        self.assertTrue(snapshot["ok"])
        self.assertEqual(snapshot["worker"]["status"], "busy")
        self.assertEqual(snapshot["scheduler"]["status"], "running")
        self.assertEqual(snapshot["counts"]["pending_jobs"], 7)
        self.assertEqual(snapshot["counts"]["recent_events"], 2)

    def test_account_pause_and_resume_api(self):
        updated = []
        events = []

        with (
            patch("app.api.endpoints.accounts.repo_update_account", side_effect=lambda account_id, payload: updated.append((account_id, payload)) or {"id": account_id}),
            patch("app.api.endpoints.accounts.repo_resume_account", return_value={"id": "acc-1"}),
            patch("app.api.endpoints.accounts.create_event", side_effect=lambda *args, **kwargs: events.append((args, kwargs))),
        ):
            paused = pause_account_api("acc-1", reason="manual")
            resumed = resume_account_api("acc-1")

        self.assertEqual(paused, {"ok": True})
        self.assertEqual(resumed, {"ok": True})
        self.assertEqual(updated[0][1]["risk_status"], "paused")
        self.assertTrue(events)


if __name__ == "__main__":
    unittest.main()
