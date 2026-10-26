export function formatShopMoney(amount: number, currency = 'KES'): string {
    return `${currency} ${new Intl.NumberFormat('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)}`;
}
