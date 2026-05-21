export interface RecordActivityDto {
  guildId: string;
  userId: string;
  username?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}
