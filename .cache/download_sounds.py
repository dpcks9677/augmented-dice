import urllib.request
import zipfile
import os
import re

url = "https://kenney.nl/assets/casino-audio"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    match = re.search(r'href="([^"]*\.zip)"', html)
    if match:
        zip_url = match.group(1)
        if not zip_url.startswith('http'):
            zip_url = "https://kenney.nl" + zip_url
        print("Found ZIP:", zip_url)
        urllib.request.urlretrieve(zip_url, "casino.zip")
        with zipfile.ZipFile("casino.zip", 'r') as zip_ref:
            zip_ref.extractall("casino_sounds")
        print("Downloaded and extracted.")
    else:
        print("ZIP not found in HTML.")
except Exception as e:
    print("Error:", e)
