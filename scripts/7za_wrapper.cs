using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;

class Program {
    static void Main(string[] args) {
        var sb = new StringBuilder();
        bool isExtract = false;
        foreach (var a in args) {
            if (a == "x") isExtract = true;
            if (sb.Length > 0) sb.Append(' ');
            if (a.Contains(" ")) {
                sb.Append('"').Append(a).Append('"');
            } else {
                sb.Append(a);
            }
        }
        if (isExtract) {
            sb.Append(" -snl-");
        }

        var psi = new ProcessStartInfo {
            FileName = @"C:\Program Files\7-Zip\7z.exe",
            Arguments = sb.ToString(),
            UseShellExecute = false,
        };
        var p = Process.Start(psi);
        p.WaitForExit();
        Environment.Exit(p.ExitCode);
    }
}
