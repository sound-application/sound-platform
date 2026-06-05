import re
import sys

# 1. Fix useCategories.ts
usecat_file = "apps/web/src/hooks/useCategories.ts"
with open(usecat_file, "r", encoding="utf-8") as f:
    usecat_content = f.read()

usecat_content = re.sub(r"import \{ collection, query, where, onSnapshot \} from 'firebase/storage';.*?// Let's use standard firestore imports\n", "", usecat_content, flags=re.DOTALL)

with open(usecat_file, "w", encoding="utf-8") as f:
    f.write(usecat_content)

# 2. Fix AudioCreatePage.tsx
audiocreate_file = "apps/web/src/pages/create/AudioCreatePage.tsx"
with open(audiocreate_file, "r", encoding="utf-8") as f:
    content = f.read()

# a) Move useCategories down below world declaration
bad_use_categories = "  const { categoryOptions, getSubcategoryOptions } = useCategories(world);\n"
content = content.replace(bad_use_categories, "")

world_decl = "const [world, setWorld] = useState<WorldId>('general');\n"
content = content.replace(world_decl, world_decl + bad_use_categories)

# b) Replace remaining CATEGORIES and SUBCATEGORIES_BY_CATEGORY
content = content.replace("CATEGORIES", "categoryOptions")
content = content.replace("SUBCATEGORIES_BY_CATEGORY", "getSubcategoryOptions")

# Wait, getSubcategoryOptions is a function, so getSubcategoryOptions[category] is wrong.
content = content.replace("getSubcategoryOptions[category]", "getSubcategoryOptions(category)")
content = content.replace("getSubcategoryOptions[categoryId]", "getSubcategoryOptions(categoryId)")
content = content.replace("getSubcategoryOptions[cat]", "getSubcategoryOptions(cat)")

# Let's fix specific spots where it's used as an object:
# (SUBCATEGORIES_BY_CATEGORY[category] || []) -> getSubcategoryOptions(category)
# Since I replaced SUBCATEGORIES_BY_CATEGORY with getSubcategoryOptions, I have to fix the brackets.
content = re.sub(r'getSubcategoryOptions\[([^\]]+)\]', r'getSubcategoryOptions(\1)', content)

with open(audiocreate_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed build errors.")
