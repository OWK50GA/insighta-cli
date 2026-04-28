export interface Profile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  gender_probability: number;
  age: number;
  age_group: 'adult' | 'child' | 'teenager' | 'senior';
  country_id: string;
  country_name: string;
  country_probability: number;
  created_at: string | Date;
}

export function formatProfile(profile: Profile): string {
  const createdAt = profile.created_at instanceof Date
    ? profile.created_at.toISOString()
    : profile.created_at;
  const lines: string[] = [
    `ID:                  ${profile.id}`,
    `Name:                ${profile.name}`,
    `Gender:              ${profile.gender} (${(profile.gender_probability * 100).toFixed(1)}%)`,
    `Age:                 ${profile.age} (${profile.age_group})`,
    `Country:             ${profile.country_name} [${profile.country_id}] (${(profile.country_probability * 100).toFixed(1)}%)`,
    `Created:             ${createdAt}`,
  ];
  return lines.join('\n');
}

export function formatProfileList(profiles: Profile[], total?: number): string {
  if (profiles.length === 0) {
    return 'No profiles found.';
  }
  const divider = '─'.repeat(40);
  const list = profiles.map(formatProfile).join(`\n${divider}\n`);
  if (total !== undefined) {
    return `${list}\n\nTotal results: ${total}`;
  }
  return list;
}

export function formatCreateSuccess(profile: Profile): string {
  return `Profile created successfully.\nID:   ${profile.id}\nName: ${profile.name}`;
}

export function formatDeleteConfirmation(id: string): string {
  return `Profile \`${id}\` deleted successfully.`;
}
