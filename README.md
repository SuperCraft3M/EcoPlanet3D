# EcoPlanet3D

EcoPlanet3D est une simulation interactive en trois dimensions conçue pour fonctionner directement dans les navigateurs web modernes. Ce projet vise à explorer des mécaniques de gestion d'écosystème au travers d'un moteur de rendu 3D temps réel.

Le projet est déployé et accessible à l'adresse suivante : **[https://ecoplanet.supercraft.tech](https://ecoplanet.supercraft.tech)**

## Présentation

Ce dépôt contient le code source d'un jeu par navigateur permettant aux utilisateurs d'interagir avec un environnement planétaire. L'objectif technique est d'offrir une expérience fluide et performante sans nécessiter d'installation client, en tirant parti des technologies WebGL.

### Fonctionnalités principales

* **Rendu 3D temps réel** : Environnement immersif généré dynamiquement.
* **Accessibilité** : Compatible avec la majorité des navigateurs (Chrome, Firefox, Edge, Safari).
* **Interactivité** : Système de contrôle complet (clavier/souris) pour la navigation et la gestion des éléments.
* **Performance** : Optimisation des assets pour garantir un framerate stable.

## Technologies utilisées

Le projet repose sur une stack technique web standard :

* **Langage** : TypeScript / JavaScript
* **Moteur 3D** : Three.js
* **Build System** : Vite
* **Interface** : HTML5 / CSS3

## Installation et développement local

Pour exécuter le projet sur une machine locale à des fins de développement ou de test, veuillez suivre les instructions ci-dessous.

### Prérequis

* Node.js (version 14 ou supérieure recommandée)
* Un gestionnaire de paquets (npm ou yarn)

### Procédure

1.  **Cloner le dépôt**
    ```bash
    git clone [https://github.com/SuperCraft3M/EcoPlanet3D.git](https://github.com/SuperCraft3M/EcoPlanet3D.git)
    cd EcoPlanet3D
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Lancer le serveur de développement**
    ```bash
    npm run dev
    ```

4.  **Accès local**
    Ouvrez votre navigateur à l'adresse indiquée par le terminal (généralement `http://localhost:5173` ou `http://localhost:3000`).

## Contrôles

* **Déplacements** : Touches directionnelles ou Z/Q/S/D. (ou flèches directionnelles)
* **Caméra** : Clic maintenu et déplacement de la souris.
* **Actions** : Clic gauche pour interagir avec l'environnement.

## Contribution

Les contributions au projet sont ouvertes. Si vous souhaitez proposer des modifications :

1.  Forkez le dépôt.
2.  Créez une branche pour votre fonctionnalité (`git checkout -b feature/nom-fonctionnalite`).
3.  Soumettez vos changements (`git commit -m "Description des ajouts"`).
4.  Poussez la branche (`git push origin feature/nom-fonctionnalite`).
5.  Ouvrez une Pull Request sur le dépôt principal.

## Auteurs / Crédits

- SuperCraft3M - développeur principal

## Licence

Ce projet est distribué sous la licence MIT. Veuillez consulter le fichier `LICENSE` pour plus d'informations.