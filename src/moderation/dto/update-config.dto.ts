export interface UpdateConfigDto {
  inactivityDays?: number;
  action?: 'kick' | 'ban';
  excludeAdmins?: boolean;
  excludeBots?: boolean;
  excludeRoles?: string[];
  enabled?: boolean;
}
