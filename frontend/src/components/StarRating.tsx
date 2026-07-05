// Composant de notation par étoiles — Material Symbols Icons uniquement.
// RÈGLE : aucun caractère Unicode d'étoile dans le code.
// Full = 'star', Half = 'star_half', Empty = 'star_border'.
const StarRating = ({ rating, size = 18 }: { rating: number; size?: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className="material-symbols-outlined"
          style={{
            fontSize: size + 'px',
            color: star <= Math.round(rating) ? '#ca8a04' : '#e5e7eb',
          }}
        >
          {star <= rating
            ? 'star'
            : star - 0.5 <= rating
              ? 'star_half'
              : 'star_border'}
        </span>
      ))}
    </div>
  );
};

export default StarRating;
