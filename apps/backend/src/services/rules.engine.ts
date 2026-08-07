import { AutomationRule, AutomationRuleCondition, AutomationRuleAction, TelemetryReading } from '@aether/shared';

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  actionsExecuted: string[];
}

export class RulesEngine {
  private static instance: RulesEngine;
  private activeRules: AutomationRule[] = [];

  private constructor() {
    this.seedDefaultRules();
  }

  public static getInstance(): RulesEngine {
    if (!RulesEngine.instance) {
      RulesEngine.instance = new RulesEngine();
    }
    return RulesEngine.instance;
  }

  private seedDefaultRules() {
    this.activeRules = [
      {
        id: 'rule-001',
        name: 'Emergency Low Moisture Auto-Pump',
        enabled: true,
        farmId: 'farm-alpha',
        zoneId: 'zone-1',
        conditionLogic: 'AND',
        conditions: [
          { metric: 'soilMoisture', operator: '<', value: 30 },
          { metric: 'airTemperature', operator: '>', value: 32 }
        ],
        actions: [
          { type: 'START_PUMP', targetId: 'pump-main-01' },
          { type: 'OPEN_VALVE', targetId: 'valve-z1-01' },
          { type: 'NOTIFY', targetId: 'all-operators', value: 'Auto-irrigation initiated due to high heat and low soil moisture.' }
        ]
      },
      {
        id: 'rule-002',
        name: 'Rain Override & Tank Protection',
        enabled: true,
        farmId: 'farm-alpha',
        conditionLogic: 'OR',
        conditions: [
          { metric: 'rainRate', operator: '>', value: 5 },
          { metric: 'tankLevelPercent', operator: '<', value: 15 }
        ],
        actions: [
          { type: 'STOP_PUMP', targetId: 'pump-main-01' },
          { type: 'NOTIFY', targetId: 'all-operators', value: 'Pump halted: Rain detected or Tank Level critical.' }
        ]
      }
    ];
  }

  public getRules(): AutomationRule[] {
    return this.activeRules;
  }

  public addRule(rule: AutomationRule): void {
    this.activeRules.push(rule);
  }

  public toggleRule(id: string, enabled: boolean): void {
    const r = this.activeRules.find((x) => x.id === id);
    if (r) r.enabled = enabled;
  }

  public evaluateReading(reading: TelemetryReading): RuleExecutionResult[] {
    const results: RuleExecutionResult[] = [];

    for (const rule of this.activeRules) {
      if (!rule.enabled) continue;
      if (rule.zoneId && rule.zoneId !== reading.zoneId) continue;

      let triggered = false;

      const conditionEvaluations = rule.conditions.map((c: AutomationRuleCondition) => {
        const val = reading[c.metric];
        if (typeof val !== 'number') return false;

        switch (c.operator) {
          case '<':
            return val < c.value;
          case '<=':
            return val <= c.value;
          case '>':
            return val > c.value;
          case '>=':
            return val >= c.value;
          case '==':
            return val === c.value;
          case '!=':
            return val !== c.value;
          default:
            return false;
        }
      });

      if (rule.conditionLogic === 'AND') {
        triggered = conditionEvaluations.length > 0 && conditionEvaluations.every((e: boolean) => e === true);
      } else {
        triggered = conditionEvaluations.some((e: boolean) => e === true);
      }

      if (triggered) {
        rule.lastTriggered = new Date().toISOString();
        const actionsExecuted = rule.actions.map(
          (a: AutomationRuleAction) => `[${a.type}] Target: ${a.targetId}${a.value ? ` Payload: ${a.value}` : ''}`
        );
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          triggered: true,
          actionsExecuted
        });
      }
    }

    return results;
  }
}
