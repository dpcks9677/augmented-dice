# Augments.json Rules

* **DO NOT** add condition or effect properties to the augments in src/augments.json. 
* ugments.json should only contain data meant to be directly exposed to the game UI (like 
ame, description, icon, 	arget, 	ype, 
eward, mutationId).
* Information that is purely for developer understanding (such as explicit condition triggers and internal effect details, which were originally parsed from ugments_explaination.md) should NOT be included in the JSON file. Only use description for user-facing explanation text.

* When writing or updating description fields in ugments.json, if a line break is needed (e.g. between sentences), manually insert <br><br> directly into the JSON string. Do not rely on JavaScript code to format the text.