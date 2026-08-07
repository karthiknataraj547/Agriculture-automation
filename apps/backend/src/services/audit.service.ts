import { AuditLogEntry, UserRole } from '@aether/shared';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  private static instance: AuditService;
  private logs: AuditLogEntry[] = [];

  private constructor() {
    this.seedInitialLogs();
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  private seedInitialLogs() {
    this.logs = [
      {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userId: 'usr-admin-01',
        userName: 'Alex Mercer (System Admin)',
        userRole: UserRole.SUPER_ADMIN,
        action: 'PROVISION_DEVICE',
        resource: 'ESP32 Node Alpha 01',
        ipAddress: '192.168.1.100',
        details: { certVerified: true, encryption: 'TLS_AES_256_GCM' },
        status: 'SUCCESS'
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        userId: 'usr-admin-01',
        userName: 'Alex Mercer (System Admin)',
        userRole: UserRole.SUPER_ADMIN,
        action: 'ACTUATE_PUMP_OVERRIDE',
        resource: 'Pump-Main-01 (Zone 1)',
        ipAddress: '192.168.1.100',
        details: { durationMinutes: 20, reason: 'Manual Test' },
        status: 'SUCCESS'
      }
    ];
  }

  public logAction(
    userId: string,
    userName: string,
    userRole: UserRole,
    action: string,
    resource: string,
    details: Record<string, any>,
    status: 'SUCCESS' | 'FAILURE' | 'DENIED' = 'SUCCESS',
    ipAddress = '127.0.0.1'
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userRole,
      action,
      resource,
      ipAddress,
      details,
      status
    };

    this.logs.unshift(entry);
    if (this.logs.length > 500) this.logs.pop();
    return entry;
  }

  public getLogs(limit = 100): AuditLogEntry[] {
    return this.logs.slice(0, limit);
  }
}
