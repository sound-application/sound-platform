import re

content = open('apps/web/src/pages/GeneralHomePage.tsx', 'r', encoding='utf-8').read()

# Fix useTranslation
content = content.replace("useTranslation('generalHome')", "useTranslation('generalhome')")

# Fix generalhome: prefix for root keys
content = content.replace("t('generalhome:", "t('")
content = content.replace("t(\"generalhome:", "t(\"")

# Fix object prefixes: statusOptions:, categoryOptions:, sortOptions:, sections:, actions:, filters:, plusBanner:
for prefix in ['statusOptions', 'categoryOptions', 'sortOptions', 'sections', 'actions', 'filters', 'plusBanner']:
    content = content.replace(f"t('{prefix}:", f"t('{prefix}.")
    content = content.replace(f"t(\"{prefix}:", f"t(\"{prefix}.")

# Edge case: t('actions.storyOf', ...)
# Since it's already using a dot, it shouldn't be affected by the colon replacement.
# But wait, looking at the code: `t('actions.storyOf', { name: item.displayName })` is correct syntax.

open('apps/web/src/pages/GeneralHomePage.tsx', 'w', encoding='utf-8').write(content)
print("Translations fixed in GeneralHomePage.tsx")
