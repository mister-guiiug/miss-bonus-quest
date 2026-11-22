import { describe, expect, it } from 'vitest';
import {
  avancerStreak,
  diffJours,
  minutesFromPoints,
  minutesPourActe,
  soldeMinutes,
} from './economy.ts';
import type { Acte, Foyer, MouvementSolde } from './types.ts';

const acteLit: Acte = {
  id: 'a1',
  titre: 'Faire son lit',
  description: '',
  portee: 'perso',
  points: 10,
  minutesDirectes: 0,
  streak: { joursRequis: 3, bonusPoints: 0, bonusMinutes: 15 },
  actif: true,
  ordre: 1,
};

describe('minutesFromPoints', () => {
  it('convertit 10 pts au taux 10→5', () => {
    expect(minutesFromPoints(10, 10, 5)).toBe(5);
  });

  it('tronque vers le bas', () => {
    expect(minutesFromPoints(7, 10, 5)).toBe(3);
  });
});

describe('minutesPourActe', () => {
  it('additionne points convertis et minutes directes', () => {
    const acte: Acte = {
      ...acteLit,
      points: 10,
      minutesDirectes: 5,
      streak: null,
    };
    expect(minutesPourActe(acte, 10, 5)).toEqual({
      minutes: 10,
      fromPoints: 5,
      directes: 5,
    });
  });
});

describe('soldeMinutes', () => {
  it('somme les mouvements et plafonne à 0', () => {
    const mouvements: MouvementSolde[] = [
      {
        id: '1',
        enfantId: 'e1',
        type: 'credit_validation',
        minutes: 10,
        pointsSource: null,
        declarationId: null,
        note: null,
        createdAt: '',
        createdBy: 'p',
      },
      {
        id: '2',
        enfantId: 'e1',
        type: 'consommation',
        minutes: -3,
        pointsSource: null,
        declarationId: null,
        note: null,
        createdAt: '',
        createdBy: 'p',
      },
      {
        id: '3',
        enfantId: 'e2',
        type: 'credit_manuel',
        minutes: 20,
        pointsSource: null,
        declarationId: null,
        note: null,
        createdAt: '',
        createdBy: 'p',
      },
    ];
    const foyer = { mouvements } as Foyer;
    expect(soldeMinutes(foyer, 'e1')).toBe(7);
  });
});

describe('avancerStreak', () => {
  it('cumule les jours consécutifs et verse le bonus au palier', () => {
    const j1 = avancerStreak(undefined, acteLit, '2026-11-20', 10, 5);
    expect(j1.progress.jours).toBe(1);
    expect(j1.bonusMinutes).toBe(0);

    const j2 = avancerStreak(j1.progress, acteLit, '2026-11-21', 10, 5);
    expect(j2.progress.jours).toBe(2);

    const j3 = avancerStreak(j2.progress, acteLit, '2026-11-22', 10, 5);
    expect(j3.bonusMinutes).toBe(15);
    expect(j3.progress.jours).toBe(0);
  });

  it('casse la série après un trou', () => {
    const apres = avancerStreak(
      { jours: 2, lastDay: '2026-11-19' },
      acteLit,
      '2026-11-22',
      10,
      5
    );
    expect(apres.progress.jours).toBe(1);
    expect(apres.bonusMinutes).toBe(0);
  });
});

describe('diffJours', () => {
  it('mesure un jour calendaire', () => {
    expect(diffJours('2026-11-22', '2026-11-21')).toBe(1);
  });
});
