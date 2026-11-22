import { createId } from '@mister-guiiug/dev-pwa-config/id';
import type { Acte, Foyer, Membre } from './types.ts';

/** Catalogue système copié à la création du foyer (MVP 1). */
export function catalogueInitial(): Acte[] {
  const base: Omit<Acte, 'id'>[] = [
    {
      titre: 'Faire son lit',
      description: 'Lit rangé le matin.',
      portee: 'perso',
      points: 10,
      minutesDirectes: 0,
      streak: { joursRequis: 3, bonusPoints: 0, bonusMinutes: 15 },
      actif: true,
      ordre: 1,
    },
    {
      titre: 'Ranger sa chambre',
      description: 'Sol et bureau dégagés.',
      portee: 'perso',
      points: 15,
      minutesDirectes: 5,
      streak: null,
      actif: true,
      ordre: 2,
    },
    {
      titre: 'Mettre la table',
      description: 'Couverts et verres pour tout le monde.',
      portee: 'collectif',
      points: 8,
      minutesDirectes: 5,
      streak: null,
      actif: true,
      ordre: 3,
    },
    {
      titre: 'Débarrasser la table',
      description: 'Assiettes et restes rangés.',
      portee: 'collectif',
      points: 8,
      minutesDirectes: 5,
      streak: null,
      actif: true,
      ordre: 4,
    },
    {
      titre: 'Faire la vaisselle',
      description: 'Laver ou remplir le lave-vaisselle.',
      portee: 'collectif',
      points: 12,
      minutesDirectes: 10,
      streak: null,
      actif: true,
      ordre: 5,
    },
    {
      titre: 'Passer le balai',
      description: 'Sols principaux balayés.',
      portee: 'collectif',
      points: 10,
      minutesDirectes: 5,
      streak: null,
      actif: true,
      ordre: 6,
    },
  ];
  return base.map(acte => ({ ...acte, id: createId('acte') }));
}

export function foyerSeed(nom = 'Notre foyer'): Foyer {
  const parent: Membre = {
    id: createId('membre'),
    role: 'parent',
    displayName: 'Parent',
    actif: true,
  };
  const enfants: Membre[] = [
    {
      id: createId('membre'),
      role: 'enfant',
      displayName: 'Léa',
      actif: true,
    },
    {
      id: createId('membre'),
      role: 'enfant',
      displayName: 'Tom',
      actif: true,
    },
  ];
  return {
    id: createId('foyer'),
    nom,
    pointsTaux: 10,
    minutesTaux: 5,
    codeEnfant: 'BONUS',
    codeCoparent: 'PARENT',
    membres: [parent, ...enfants],
    actes: catalogueInitial(),
    declarations: [],
    mouvements: [],
    streaks: {},
    updatedAt: new Date().toISOString(),
  };
}
