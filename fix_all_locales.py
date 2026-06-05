import os
import re

valid_namespaces = {
    'account', 'audiocreate', 'auth', 'categorydiscovery', 'common', 'connectivitybanner', 'create', 
    'createhub', 'editprofile', 'filterdropdown', 'generaldiscover', 'generalhome', 'generalme', 
    'globalcreatehub', 'home', 'index', 'live', 'liveworldselector', 'lockedlabels', 'musicdiscover', 
    'musichome', 'musiclive', 'musicme', 'player', 'playlistdetail', 'playlists', 'plusdiscover', 
    'plushome', 'plusme', 'privacysettings', 'profile', 'radiodiscover', 'radiohome', 'radiome', 
    'settings', 'tournamentsdiscover', 'tournamentshome', 'tournamentslive', 'tournamentsme', 
    'useaudiorecorder', 'useaudioupload', 'usefollowstate', 'useviewerprofile', 'world'
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all instances of t('PREFIX:SUFFIX') or t("PREFIX:SUFFIX")
    # We use a function to replace them if PREFIX is not in valid_namespaces
    def replacer(match):
        prefix = match.group(2)
        suffix = match.group(3)
        quote = match.group(1)
        
        # If prefix is not a valid namespace, it's an object key, so we need a dot instead of colon
        if prefix.lower() not in valid_namespaces:
            return f"t({quote}{prefix}.{suffix}{quote}"
        else:
            # Leave as is
            return match.group(0)

    # Regex looks for t('prefix:suffix
    # Note: suffix might contain more dots or characters, we match up to the closing quote
    new_content = re.sub(r't\(([\'"])([a-zA-Z0-9_]+):([^\'"]+)\1', replacer, content)

    # Also, we saw useTranslation('generalHome') with camelCase which breaks if file is generalhome.json.
    # Let's just fix known case mismatches:
    new_content = new_content.replace("useTranslation('generalHome')", "useTranslation('generalhome')")
    new_content = new_content.replace("useTranslation('musicHome')", "useTranslation('musichome')")
    new_content = new_content.replace("useTranslation('radioHome')", "useTranslation('radiohome')")
    new_content = new_content.replace("useTranslation('plusHome')", "useTranslation('plushome')")
    new_content = new_content.replace("useTranslation('tournamentsHome')", "useTranslation('tournamentshome')")
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed: {filepath}")

# Walk the src directory
src_dir = os.path.join('apps', 'web', 'src')
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

print("Done scanning and fixing.")
