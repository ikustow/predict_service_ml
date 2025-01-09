"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictOrdersWithStats = void 0;
// @ts-ignore
const ml_regression_1 = require("ml-regression");
const predictOrdersWithStats = (orders, period, count) => {
    // Prepare data for prediction
    const periods = orders.map((_, index) => index + 1); // Using index as the period number
    const quantities = orders.map(order => order.quantity);
    // Train polynomial regression model
    const regression = new ml_regression_1.PolynomialRegression(periods, quantities, 2); // Polynomial of degree 2
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
        }
        else {
            acc.push({ product: order.product, totalQuantity: order.quantity, count: 1 });
        }
        return acc;
    }, []);
    const products = productAggregates.map(p => ({
        product: p.product,
        predicted_average_quantity: p.totalQuantity / p.count,
    }));
    return { predictions, products };
};
exports.predictOrdersWithStats = predictOrdersWithStats;
