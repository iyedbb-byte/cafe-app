# Brief Marketing — Café Azur (application de menu digital)

> Ce fichier décrit factuellement l'application, ses fonctionnalités et son contexte.
> Il est destiné à un agent IA chargé de rédiger une **documentation marketing** (site,
> plaquette, post, page de vente, argumentaire commercial).
> **Important : ne pas inventer de fonctionnalités.** Ne décrire que ce qui figure ci-dessous.

---

## 1. Résumé en une phrase

**Café Azur** est une application web de **menu digital en temps réel** pour cafés, snacks
et restaurants : le client scanne un QR code et voit la carte du jour toujours à jour,
tandis que le gérant active ou désactive chaque produit en un clic depuis son téléphone.

---

## 2. Positionnement & contexte

- **Secteur :** restauration / cafés / snacks / pâtisseries.
- **Marché de référence :** Tunisie (prix en **dinars tunisiens — DT**, marché de La Marsa).
- **Problème résolu :**
  - Les cartes papier sont coûteuses à réimprimer et deviennent obsolètes (rupture de stock,
    plat du jour, changement de prix).
  - Les serveurs perdent du temps à répondre « il n'y en a plus ».
  - Les clients veulent voir la carte sans attendre.
- **Réponse :** une carte numérique accessible par QR code, **mise à jour en direct**,
  sans application à installer côté client (site web mobile).

---

## 3. Public cible

**Cibles principales (acheteurs) :**
- Propriétaires et gérants de cafés, snacks, salons de thé, pâtisseries, restaurants.
- Franchises et petits réseaux (plusieurs points de vente).

**Utilisateurs finaux :**
- Les clients du café (via QR code, sur leur propre téléphone).
- Le personnel / gérant (via l'espace d'administration).

**Taille :** indépendants et petites chaînes qui veulent une solution simple, sans matériel
et sans compétence technique.

---

## 4. Proposition de valeur

1. **Zéro impression, zéro gaspillage** : la carte est numérique et modifiable à l'infini.
2. **Mise à jour instantanée** : un produit épuisé disparaît en direct chez tous les clients.
3. **Disponibilité du jour** : on indique jour par jour ce qui est disponible aujourd'hui.
4. **Multilingue** : français, arabe (avec affichage droite-à-gauche) et anglais.
5. **Sans installation** : aucun magasin d'applications, le client ouvre un lien / scanne un QR.
6. **Personnalisation totale de l'image de marque** : couleurs, polices, bannière, photos,
   vidéos promotionnelles, réseaux sociaux.
7. **Adresse stable via QR code** : un seul QR imprimé, valable durablement.

---

## 5. Fonctionnalités — Côté client (le client du café)

- **Accès par QR code / lien** vers la page du menu (`#/menu/<slug>`), sans compte ni installation.
- **Bandeau d'accueil (hero) configurable** :
  - Dégradé par défaut, **image**, ou **vidéos promotionnelles** (jusqu'à 4, lecture en boucle,
    muettes, rotation automatique toutes les 10 secondes).
- **Indicateur « En direct » + date du jour** et **compteur de produits disponibles**.
- **Navigation par catégories** : puces (chips) collantes, défilement fluide, mise en surbrillance
  automatique de la catégorie visible.
- **Fiches produits** : emoji ou photo, nom, description courte, **prix en DT** (3 décimales),
  badge « Disponible ».
- **La carte n'affiche que ce qui est réellement disponible** : les produits épuisés ou retirés
  n'apparaissent pas.
- **Sélecteur de langue** : Français / العربية / English, avec passage automatique en RTL pour l'arabe.
- **Réseaux sociaux** en pied de page (Facebook, Instagram).
- **Pied de page** : horaires, adresse, mention des prix (« service compris »).
- **Expérience mobile soignée** : design responsive (mobile d'abord), animations douces,
  respect de la préférence « animations réduites ».
- **Actualisation automatique** de la page sans rechargement (voir §7).

---

## 6. Fonctionnalités — Côté administration (le gérant)

Accès protégé par **connexion e-mail + mot de passe**.

### 6.1 Aujourd'hui — disponibilité du jour
- Liste des produits **groupés par catégorie** avec **interrupteur activer/désactiver** par produit.
- Boutons **« Tout activer » / « Tout désactiver »** par catégorie et pour l'ensemble.
- **Compteurs en direct** : Disponibles / Épuisés / Sur la carte.
- **Recherche instantanée** d'un produit.
- Indication de la **dernière modification** et statut de synchronisation.

### 6.2 Produits
- **Ajouter / modifier / supprimer** un produit.
- Champs : nom, prix (DT), emoji, catégorie, description courte, image.
- **Image** : par lien URL **ou téléversement** depuis l'appareil.
- Case **« Présent sur la carte »** : un produit non listé n'apparaît jamais aux clients.

### 6.3 Catégories
- **Ajouter** une catégorie, **renommer**, changer l'**emoji**.
- **Réordonner** (monter / descendre).
- **Supprimer** (protégé : impossible si la catégorie contient des produits).

### 6.4 Apparence (personnalisation de la marque)
- **Bannière** : choix entre dégradé, image ou vidéos promotionnelles.
- **Arrière-plan de page** : couleur (avec nuanciers prédéfinis) ou image.
- **Polices** : choix de polices **Google Fonts** pour le français et pour l'arabe
  (dont *Orbitron*), avec **aperçu** en direct.
- **Couleur du texte** (nuanciers + réinitialisation).
- **Réseaux sociaux** : liens Facebook et Instagram.
- **Aperçu en direct** : les changements sont appliqués immédiatement au menu client.

### 6.5 QR & Réglages
- **Génération d'un QR code** pointant vers le menu.
- **Copier le lien** du menu, **ouvrir** le menu, **télécharger le QR** en image (PNG).
- **Informations du café** : nom, slogan, horaires, adresse.

### 6.6 Confort d'usage
- **Enregistrement automatique** des modifications.
- **Notifications (toasts)** de confirmation.
- **Interface bilingue** (FR / AR / EN) et **adaptée au mobile** (barre de navigation en bas).

---

## 7. Fonctionnement temps réel

- En mode connecté : la page client **interroge le serveur toutes les 6 secondes** et se met à jour
  automatiquement (aucun rechargement manuel).
- Si l'API est indisponible, l'application bascule en **mode démo local** automatique
  (données stockées dans le navigateur) — utile pour présenter/tester sans infrastructure.

---

## 8. Caractéristiques techniques (pour la crédibilité)

- **Architecture :** application web monopage (SPA) — un seul fichier HTML/CSS/JS, **sans étape
  de build**, sans framework.
- **Hébergement / exécution :** **Cloudflare Workers** (fonction serverless) servant à la fois
  les fichiers statiques et l'API REST.
- **Base de données :** **Cloudflare D1** (base SQL). Tables : cafés, catégories, produits,
  disponibilité quotidienne, administrateurs, sessions, fichiers.
- **API REST sécurisée** : authentification par **jeton (session 24 h)**, mots de passe hachés
  en **SHA-256**.
- **Images** téléversées stockées et servies par l'application (limite 1,5 Mo par image).
- **Internationalisation** intégrée (3 langues) et **support RTL** natif.
- **Aucune application à installer** pour le client final.

---

## 9. Bénéfices pour le gérant (arguments de vente)

- Réduction des coûts d'impression et des erreurs de prix.
- Moins de questions au comptoir, service plus fluide.
- Image de marque moderne et haut de gamme (personnalisation complète).
- Prise en main immédiate : tout se gère depuis un téléphone.
- Mise à jour en temps réel, fiable, sans compétence technique.

## 10. Bénéfices pour le client final

- Carte toujours à jour, consultable instantanément par QR code.
- Confort de lecture sur son propre téléphone, dans sa langue.
- Vision claire de ce qui est réellement disponible aujourd'hui.

---

## 11. Cas d'usage typiques

1. **Le matin**, le gérant ouvre l'espace admin et active les produits disponibles du jour.
2. **En cours de journée**, un plat s'épuise : il le désactive, la carte client se met à jour en direct.
3. **Le client** s'assoit, scanne le QR code sur la table et parcourt la carte dans sa langue.
4. **À la fermeture**, le gérant peut désactiver des produits ou préparer la carte du lendemain.
5. **En vitrine / réseaux sociaux**, le QR code et le lien du menu servent d'accès permanent.

---

## 12. Éléments de marque à réutiliser

- **Nom affiché :** Café Azur.
- **Slogan actuel :** « Torréfaction & pâtisserie — La Marsa ».
- **Identité visuelle :** bleu profond (marine) et brun/crème — ambiance élégante et chaleureuse.
- **Logotype :** tasse de café stylisée (emblème SVG fourni dans l'app).
- **Devise :** dinar tunisien (DT). **Lieu :** La Marsa, Tunisie.

---

## 13. Ton & style recommandés pour la documentation marketing

- Professionnel, chaleureux et rassurant ; orienté bénéfices concrets (temps, argent, image de marque).
- Vocabulaire : « carte digitale », « menu en temps réel », « disponibilité du jour »,
  « QR code », « sans installation », « personnalisable ».
- S'adresser à deux lecteurs : le **gérant** (décideur) et le **technophile curieux**.
- Fournir des appels à l'action clairs : *essayer, voir la démo, générer le QR, nous contacter*.

---

## 14. Structure suggérée pour la documentation marketing

1. Titre + accroche (promesse en une phrase).
2. Le problème (carte papier, ruptures, temps perdu).
3. La solution Café Azur (QR + temps réel).
4. Comment ça marche (3 étapes : créer la carte / imprimer le QR / mettre à jour en direct).
5. Fonctionnalités clés (client + administration) — illustrées.
6. Personnalisation / image de marque.
7. Bénéfices par profil (gérant / client).
8. À propos de la technologie (Cloudflare, temps réel, multilingue).
9. Tarif / offre *(à définir par le propriétaire — ne pas inventer de prix)*.
10. Contact + appel à l'action.

---

## 15. Ce qu'il ne faut PAS affirmer (faits à ne pas inventer)

- **Aucun prix, forfait ou abonnement** n'est défini dans l'application → ne pas en inventer.
- Pas de **paiement en ligne** ni de **commande à table** : l'app présente le menu, elle ne prend
  pas de commandes ni de paiements.
- Pas de **gestion des stocks en quantités** : uniquement une disponibilité activée/désactivée par jour.
- Pas d'**application mobile native** : c'est un site web accessible par QR code.
- Pas de **réservation de table** ni de **programme de fidélité**.
- Il n'existe qu'**un seul établissement** configuré par instance (café « Café Azur » / slug `cafe-azur`).

---

## 16. Chiffres & détails vérifiables (à citer sans reformulation ambiguë)

- Actualisation côté client : **toutes les 6 secondes**.
- Rotation des vidéos promotionnelles : **toutes les 10 secondes**, **jusqu'à 4 vidéos**, muettes et en boucle.
- Sessions administrateur : **24 heures**.
- Taille maximale d'une image téléversée : **1,5 Mo**.
- Prix affichés avec **3 décimales** en **DT**.
- Langues disponibles : **français, arabe, anglais** (arabe en affichage RTL).
- Fonctionne **sans étape de build** (un seul fichier HTML) ; fallback **mode démo local** si l'API est absente.
