// Indicateur de chargement aux couleurs de la marque : le logo Shopizi qui
// respire, avec trois points animes en dessous. Remplace le cercle qui tourne
// sur les ecrans de chargement pleine page. Ne porte aucun conteneur ni hauteur
// pour se glisser tel quel dans les blocs de chargement existants.
export default function ShopiziLoader() {
  return (
    <div className="flex flex-col items-center gap-3">
      <img
        src="/logo-shopizi.png"
        alt="Shopizi"
        className="w-16 h-16 object-contain shopizi-loader-logo"
      />
      <div className="flex gap-1.5">
        <span className="shopizi-loader-dot" />
        <span className="shopizi-loader-dot" />
        <span className="shopizi-loader-dot" />
      </div>
    </div>
  );
}
