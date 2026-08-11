# AgriFlow Native Windows 11 Executable C# Compiler (.EXE)
$csharpCode = @"
using System;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace AgriFlowDesktop {
    public class Program {
        [STAThread]
        public static void Main() {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Form form = new Form();
            form.Text = "AgriFlow Smart Agriculture Native App (Windows 11)";
            form.Width = 1300;
            form.Height = 850;
            form.StartPosition = FormStartPosition.CenterScreen;
            form.BackColor = Color.FromArgb(9, 13, 22);

            WebBrowser browser = new WebBrowser();
            browser.Dock = DockStyle.Fill;
            browser.ScriptErrorsSuppressed = true;
            browser.Navigate("https://agriculture-automation.vercel.app");

            form.Controls.Add(browser);
            Application.Run(form);
        }
    }
}
"@

$outDir = "d:\IrIgation\apps\frontend\public\downloads"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

$exePath = Join-Path $outDir "AgriFlow-Setup.exe"

Add-Type -TypeDefinition $csharpCode -OutputAssembly $exePath -OutputType ConsoleApplication -ReferencedAssemblies "System.Windows.Forms", "System.Drawing"

Write-Host "✅ Real Windows 11 Native Executable generated at: $exePath"
