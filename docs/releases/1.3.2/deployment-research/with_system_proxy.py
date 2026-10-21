"""Use the existing Windows system proxy in one child process; no OS changes."""
import os,sys,subprocess,winreg
from urllib.parse import urlsplit
with winreg.OpenKey(winreg.HKEY_CURRENT_USER,r"Software\Microsoft\Windows\CurrentVersion\Internet Settings") as key:
    enabled=winreg.QueryValueEx(key,"ProxyEnable")[0]
    configured=winreg.QueryValueEx(key,"ProxyServer")[0]
if not enabled: raise SystemExit("Existing system proxy is not enabled")
entries=dict(item.split("=",1) for item in configured.split(";") if "=" in item)
address=entries.get("https",entries.get("http",configured))
if "://" not in address: address="http://"+address
parsed=urlsplit(address)
if parsed.username or parsed.password: raise SystemExit("Configured authenticated proxy needs separate credential-safe handling")
if parsed.scheme not in ["http","https","socks5","socks5h"] or not parsed.hostname: raise SystemExit("Unsupported configured proxy format")
env=os.environ.copy();env["HTTPS_PROXY"]=address;env["NO_PROXY"]="localhost,127.0.0.1"
if len(sys.argv)<2: raise SystemExit("Pass a program followed by its arguments")
raise SystemExit(subprocess.run(sys.argv[1:],env=env).returncode)
