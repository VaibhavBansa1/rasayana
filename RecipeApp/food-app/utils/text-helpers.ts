export const cleanHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

export const truncateText = (text: string, length: number): string => {
  const cleanText = cleanHtmlTags(text);
  if (cleanText.length <= length) return cleanText;
  return cleanText.substring(0, length) + '...';
};

export const formatIngredient = (ingredient: any): string => {
  const amount = ingredient.metric_amount;
  const unit = ingredient.metric_unitShort;
  const meta = ingredient.meta.join(' ');
  const name = ingredient.nameClean || ingredient.name;
  
  return `${amount}${unit ? ` ${unit}` : ''} ${meta ? `${meta} ` : ''}${name}`.trim();
};