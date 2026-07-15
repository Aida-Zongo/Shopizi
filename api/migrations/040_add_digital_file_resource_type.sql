-- ============================================
-- Migration: 040_add_digital_file_resource_type.sql
-- Description: Mémorise le resource_type Cloudinary du fichier vendu.
--
--   Les PDF sont désormais stockés en resource_type 'image' : c'est le seul
--   type sur lequel Cloudinary sait rendre une page, ce qui permet de dériver
--   la couverture de la page 1. Les autres formats restent en 'raw'.
--
--   Le téléchargement DOIT relire l'asset avec le type utilisé à l'upload.
--   Déduire ce type du file_type casserait les produits publiés avant ce
--   changement : leurs PDF sont en 'raw'. D'où la colonne, et le DEFAULT 'raw'
--   qui décrit exactement l'existant.
-- ============================================

ALTER TABLE digital_products
  ADD COLUMN IF NOT EXISTS file_resource_type VARCHAR(10) NOT NULL DEFAULT 'raw';
