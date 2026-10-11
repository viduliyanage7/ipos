export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `Rs. ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
