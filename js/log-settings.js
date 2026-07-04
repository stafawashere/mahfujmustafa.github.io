(function logAllSettings() {
   const schema = window.CURIE_ANIM_SCHEMA || {};

   let saved = {};
   try { saved = JSON.parse(localStorage.getItem("curieAnimCfg") || "{}") || {}; } catch (e) {}

   const rows = [];

   for (const key of Object.keys(schema)) {
      const spec = schema[key];
      const hasOverride = Object.prototype.hasOwnProperty.call(saved, key);
      const value = hasOverride ? saved[key] : spec.def;

      rows.push({
         setting: key,
         value: value,
         default: spec.def,
         source: hasOverride ? "saved" : "default"
      });
   }

   const accent = Object.prototype.hasOwnProperty.call(saved, "accent");
   if (accent) {
      rows.push({ setting: "accent", value: saved.accent, default: "(theme default)", source: "saved" });
   }

   console.group("settings (" + rows.length + ")");
   for (const row of rows) {
      console.log(row.setting + ":", row.value, "(" + row.source + ", default " + row.default + ")");
   }
   console.table(rows);
   console.groupEnd();

   return rows;
})();
