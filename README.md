# 🏆 Olympique Rémois — Site Officiel v2

Stack : **Next.js 14** + **Supabase** + **Vercel**

---

## 🚀 Déploiement

### 1. Base de données Supabase
- Va dans **Supabase → SQL Editor → New query**
- Colle tout le contenu de `lib/schema.sql`
- Clique **Run** → toutes les tables + données sont créées

### 2. Variables Vercel
Dans **Vercel → Settings → Environment Variables** :

| Nom | Valeur |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yaydjolbkipdvbuugxdl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_cCZG9ysiNRuiks49C5debg_DgBcLo4Q` |

### 3. Redeploy → c'est en ligne !

---

## 🔐 Créer un compte Admin
1. Va sur ton site → **Mon compte** → **Inscription**
2. Crée un compte avec ton email
3. Dans **Supabase → Table Editor → profiles**
4. Trouve ton email → change le champ `role` de `supporter` à `admin`
5. Tu as accès au panneau admin sur le site !
