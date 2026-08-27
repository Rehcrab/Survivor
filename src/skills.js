function createSkill(id) {
  return { id: id, level: 1 };
}

function skillDef(id) {
  return CONFIG.skills[id];
}
