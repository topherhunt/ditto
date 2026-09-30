-- Audio always plays once when an item appears, so the autoplay preference is gone.
UPDATE users SET prefs = json_remove(prefs, '$.en.autoplay', '$.el.autoplay', '$.es.autoplay', '$.fr.autoplay', '$.it.autoplay', '$.nl.autoplay', '$.ga.autoplay');
