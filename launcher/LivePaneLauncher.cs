using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

internal static class LivePaneLauncher
{
    private const int JobObjectInfoClassExtended = 9;
    private const uint JobObjectLimitKillOnJobClose = 0x2000;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(
        IntPtr hJob,
        int jobObjectInfoClass,
        ref JobObjectExtendedLimitInformation lpJobObjectInfo,
        uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBox(IntPtr hWnd, string text, string caption, uint type);

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectBasicLimitInformation
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IoCounters
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectExtendedLimitInformation
    {
        public JobObjectBasicLimitInformation BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    private static int Main(string[] args)
    {
        // Once Live Pane is installed, this launcher only opens the installed
        // app, so old shortcuts and pins don't start the development version.
        // --dev still runs the development version from source.
        if (!HasArg(args, "--dev"))
        {
            string installed = FindInstalledApp();
            if (installed != null)
            {
                return OpenInstalledApp(installed, args);
            }
        }

        bool createdNew;
        using (Mutex mutex = new Mutex(true, @"Local\ChurchLivePaneLauncher", out createdNew))
        {
            if (!createdNew)
            {
                return 0;
            }

            try
            {
                return Run(args);
            }
            catch (Exception ex)
            {
                ShowError(ex.Message);
                return 1;
            }
        }
    }

    private static int Run(string[] args)
    {
        string root = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        string packageJson = Path.Combine(root, "package.json");
        if (!File.Exists(packageJson))
        {
            ShowError("Live Pane.exe needs to stay in the project folder, next to package.json.");
            return 1;
        }

        string npm = FindNpm();
        if (npm == null)
        {
            ShowError("Node.js was not found. Install it from https://nodejs.org/ and open Live Pane again.");
            return 1;
        }

        string logPath = LogPath();
        Directory.CreateDirectory(Path.GetDirectoryName(logPath));
        bool watch = HasArg(args, "--watch-propresenter");
        string command = "/d /s /c \"\"" + npm + "\" run desktop\"";

        ProcessStartInfo start = new ProcessStartInfo();
        start.FileName = Environment.GetEnvironmentVariable("ComSpec");
        if (string.IsNullOrEmpty(start.FileName))
        {
            start.FileName = "cmd.exe";
        }
        start.Arguments = command;
        start.WorkingDirectory = root;
        start.UseShellExecute = false;
        start.CreateNoWindow = true;
        start.RedirectStandardOutput = true;
        start.RedirectStandardError = true;
        if (watch)
        {
            start.EnvironmentVariables["LIVE_PANE_WATCH"] = "1";
        }

        IntPtr job = CreateJob();
        DateTime started = DateTime.UtcNow;
        using (Process process = new Process())
        {
            process.StartInfo = start;
            process.Start();
            if (job != IntPtr.Zero)
            {
                AssignProcessToJobObject(job, process.Handle);
            }

            StringBuilder output = new StringBuilder();
            process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e)
            {
                AppendLog(logPath, output, e.Data);
            };
            process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e)
            {
                AppendLog(logPath, output, e.Data);
            };
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();

            if (process.ExitCode != 0 && (DateTime.UtcNow - started).TotalSeconds < 20)
            {
                string detail = output.Length == 0
                    ? "npm.cmd run desktop stopped immediately."
                    : output.ToString();
                if (detail.Length > 700)
                {
                    detail = detail.Substring(detail.Length - 700);
                }
                ShowError(detail);
            }

            if (job != IntPtr.Zero)
            {
                CloseHandle(job);
            }
            return process.ExitCode;
        }
    }

    private static string FindInstalledApp()
    {
        string local = Environment.GetEnvironmentVariable("LOCALAPPDATA");
        if (string.IsNullOrEmpty(local))
        {
            local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        }
        string[] candidates =
        {
            Path.Combine(local, @"Programs\live-pane\Live Pane.exe"),
            Path.Combine(local, @"Programs\Live Pane\Live Pane.exe"),
        };
        foreach (string candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }
        return null;
    }

    private static int OpenInstalledApp(string exe, string[] args)
    {
        try
        {
            ProcessStartInfo start = new ProcessStartInfo(exe);
            start.UseShellExecute = false;
            start.WorkingDirectory = Path.GetDirectoryName(exe);
            if (HasArg(args, "--watch-propresenter"))
            {
                start.Arguments = "--watch-propresenter";
            }
            Process.Start(start).Dispose();
            return 0;
        }
        catch (Exception ex)
        {
            ShowError(ex.Message);
            return 1;
        }
    }

    private static IntPtr CreateJob()
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero)
        {
            return IntPtr.Zero;
        }

        JobObjectExtendedLimitInformation info = new JobObjectExtendedLimitInformation();
        info.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose;
        int size = Marshal.SizeOf(typeof(JobObjectExtendedLimitInformation));
        if (!SetInformationJobObject(job, JobObjectInfoClassExtended, ref info, (uint)size))
        {
            CloseHandle(job);
            return IntPtr.Zero;
        }
        return job;
    }

    private static bool HasArg(string[] args, string name)
    {
        if (args == null)
        {
            return false;
        }
        for (int i = 0; i < args.Length; i++)
        {
            if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }

    private static string FindNpm()
    {
        string path = Environment.GetEnvironmentVariable("PATH") ?? "";
        string[] parts = path.Split(';');
        for (int i = 0; i < parts.Length; i++)
        {
            string dir = parts[i].Trim();
            if (dir.Length == 0)
            {
                continue;
            }
            string candidate = Path.Combine(dir, "npm.cmd");
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string standard = Path.Combine(programFiles, "nodejs", "npm.cmd");
        if (File.Exists(standard))
        {
            return standard;
        }
        return null;
    }

    private static string LogPath()
    {
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return Path.Combine(local, "Live Pane", "launcher.log");
    }

    private static void AppendLog(string logPath, StringBuilder recent, string line)
    {
        if (string.IsNullOrEmpty(line))
        {
            return;
        }
        lock (recent)
        {
            recent.AppendLine(line);
            if (recent.Length > 4000)
            {
                recent.Remove(0, recent.Length - 4000);
            }
            try
            {
                File.AppendAllText(logPath, line + Environment.NewLine);
            }
            catch (IOException)
            {
            }
        }
    }

    private static void ShowError(string message)
    {
        MessageBox(IntPtr.Zero, message, "Live Pane", 0x10);
    }
}
