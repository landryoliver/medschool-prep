/**
 * The class colour on a card is part of the ANSWER.
 *
 * Amino acid cards carry a top border tinted by class — yellow nonpolar,
 * green polar, red acidic, blue basic. On a card asking you to name the
 * structure that is a give-away: the options in a round are not matched by
 * class, so the colour alone often eliminates every wrong answer. It is the
 * same failure the validator already polices for `aminoAcid` question
 * visuals, which must wait until the question is answered.
 *
 * So the accent is withheld until the answer is showing. Both the ladder
 * drill and the flashcard deck go through here rather than deciding
 * separately, because the two got it inconsistent when they did.
 */
export function revealAccent(accent, revealed) {
  if (!accent || !revealed) return undefined
  return { borderTop: `3px solid ${accent}` }
}
