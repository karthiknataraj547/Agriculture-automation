# AgriFlow Native Windows 11 Executable C# Compiler (.EXE)
$csharpCode = @"
using System;
using System.Diagnostics;
using System.Windows.Forms;

namespace AgriFlowLauncher {
    public class Program {
        [STAThread]
        public static void Main() {
            try {
                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = "msedge.exe";
                startInfo.Arguments = "--app=https://agriculture-automation.vercel.app --enable-features=WebBluetooth";
                startInfo.UseShellExecute = true;
                Process.Start(startInfo);
            } catch (Exception ex) {
                MessageBox.Show("Failed to launch AgriFlow Native App: " + ex.Message, "AgriFlow Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
"@

$outDir = "d:\IrIgation\apps\frontend\public\downloads"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

$exePath = Join-Path $outDir "AgriFlow-Setup.exe"

Add-Type -TypeDefinition $csharpCode -OutputAssembly $exePath -OutputType WindowsApplication -ReferencedAssemblies "System.Windows.Forms"

Write-Host "✅ Real Windows 11 Native Executable generated at: $exePath"
