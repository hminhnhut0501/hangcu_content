import os
import re

file_path = 'templates/index.html'

with open(file_path, 'r') as f:
    content = f.read()

# Global body
content = content.replace('bg-slate-950 text-slate-100 min-h-screen', 'bg-slate-50 text-slate-900 min-h-screen')

# The appShell div sidebar (aside)
content = re.sub(r'bg-\[radial-gradient.*?\]', 'bg-[#1e2336]', content)
content = content.replace('border-r border-slate-800 bg-slate-900', 'border-r border-slate-800 bg-[#1e2336] text-slate-300') # Dark sidebar
content = content.replace('bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto', 'bg-[#1e2336] text-white border-l border-slate-800 shadow-2xl overflow-y-auto') # Drawer

# Top header
content = content.replace('bg-slate-950/70 backdrop-blur-xl', 'bg-white shadow-sm backdrop-blur-none')
content = content.replace('border-b border-slate-800 px-8 py-5 flex items-center justify-between bg-white', 'border-b border-slate-200 px-8 py-5 flex items-center justify-between bg-white')

# Cards and sections
content = content.replace('bg-slate-900/60', 'bg-white shadow-sm rounded-xl')
content = content.replace('bg-slate-900/50', 'bg-white shadow-sm rounded-xl')
content = content.replace('bg-slate-950/70', 'bg-slate-50')
content = content.replace('bg-slate-950/60', 'bg-slate-50')
content = content.replace('bg-slate-950/50', 'bg-slate-50')
content = content.replace('bg-slate-950', 'bg-white')

# Borders
content = content.replace('border-slate-800', 'border-slate-200')
content = content.replace('border-slate-700', 'border-slate-300')

# Text colors for contrast
content = content.replace('text-slate-500', 'text-slate-500')
content = content.replace('text-slate-400', 'text-slate-500')
content = content.replace('text-slate-300', 'text-slate-600')
content = content.replace('text-slate-200', 'text-slate-700')
content = content.replace('text-slate-100', 'text-slate-900')

# Inputs
content = content.replace('bg-white border-slate-200 px-4 py-3', 'bg-white border-slate-300 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none')

# Fix sidebar active/inactive nav classes which might have been messed up by global text replace
content = content.replace(
    "activeNav: 'bg-cyan-500 text-slate-900 font-semibold'",
    "activeNav: 'bg-[#0088ff] text-white font-semibold shadow-md'"
)
content = content.replace(
    "inactiveNav: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-800'",
    "inactiveNav: 'text-slate-300 hover:bg-white/10 border border-transparent'"
)
content = content.replace(
    "activeNav: 'bg-cyan-500 text-slate-950 font-semibold'",
    "activeNav: 'bg-[#0088ff] text-white font-semibold shadow-md'"
)
content = content.replace(
    "inactiveNav: 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'",
    "inactiveNav: 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'"
)

# Buttons
content = content.replace('bg-slate-900 border border-slate-200', 'bg-white border border-slate-300 hover:bg-slate-50')
content = content.replace('bg-slate-800 text-slate-700', 'bg-slate-100 text-slate-700 hover:bg-slate-200')
content = content.replace('bg-cyan-500 text-slate-950', 'bg-[#0088ff] text-white hover:bg-blue-600')
content = content.replace('bg-cyan-500 text-slate-900', 'bg-[#0088ff] text-white hover:bg-blue-600')

# Header text in light mode
content = content.replace('text-slate-200 font-semibold', 'text-slate-700 font-semibold')
content = content.replace('text-cyan-400', 'text-[#0088ff]')

with open(file_path, 'w') as f:
    f.write(content)

print("Theme updated.")
