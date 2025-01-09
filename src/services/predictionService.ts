// @ts-ignore
import { PolynomialRegression } from 'ml-regression';
import { OrderData } from '../models/OrderData';

export const predictOrdersWithStats = (orders: OrderData[], period: 'day' | 'month' | 'year', count: number): { predictions: number[]; products: { product: string; predicted_average_quantity: number }[] } => {
    // Prepare data for prediction
    const periods = orders.map((_, index) => index + 1); // Using index as the period number
    const quantities = orders.map(order => order.quantity);

    // Train polynomial regression model
    const regression = new PolynomialRegression(periods, quantities, 2); // Polynomial of degree 2

    // Predict future periods
    const predictions = Array.from({ length: count }, (_, i) => {
        const futurePeriod = periods.length + i + 1;
        return regression.predict(futurePeriod);
    });

    // Calculate predicted average quantities per product
    const productAggregates = orders.reduce((acc, order) => {
        const product = acc.find(p => p.product === order.product);
        if (product) {
            product.totalQuantity += order.quantity;
            product.count += 1;
        } else {
            acc.push({ product: order.product, totalQuantity: order.quantity, count: 1 });
        }
        return acc;
    }, [] as { product: string; totalQuantity: number; count: number }[]);

    const products = productAggregates.map(p => ({
        product: p.product,
        predicted_average_quantity: p.totalQuantity / p.count,
    }));

    return { predictions, products };
};