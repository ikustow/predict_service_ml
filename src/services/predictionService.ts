import * as tf from '@tensorflow/tfjs-node';
import { OrderData } from '../models/OrderData';

export const predictOrders = async (
    orders: OrderData[],
    period: 'day' | 'month' | 'year',
    count: number
): Promise<{ date: string; predicted_value_of_orders: number; products: { product: string; predicted_average_quantity: number }[] }[]> => {
    // Prepare data for training
    const productQuantities = orders.reduce((acc, order) => {
        if (!acc[order.product]) {
            acc[order.product] = [];
        }
        acc[order.product].push(order.quantity);
        return acc;
    }, {} as Record<string, number[]>);

    // Train a simple linear regression model for each product
    const productModels: Record<string, tf.LayersModel> = {};
    for (const product in productQuantities) {
        const xs = tf.tensor2d(productQuantities[product].map((_, i) => [i]));
        const ys = tf.tensor2d(productQuantities[product].map((q) => [q]));

        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

        await model.fit(xs, ys, { epochs: 50 });
        productModels[product] = model;
    }

    // Generate predictions
    const now = new Date();
    const predictions = Array.from({ length: count }, (_, i) => {
        const futureDate = new Date(now);
        switch (period) {
            case 'day':
                futureDate.setDate(futureDate.getDate() + i + 1);
                break;
            case 'month':
                futureDate.setMonth(futureDate.getMonth() + i + 1);
                break;
            case 'year':
                futureDate.setFullYear(futureDate.getFullYear() + i + 1);
                break;
        }

        const products = Object.entries(productModels).map(([product, model]) => {
            const prediction = model.predict(tf.tensor2d([[i + productQuantities[product].length]])) as tf.Tensor;
            const predictedValue = prediction.dataSync()[0];
            return { product, predicted_average_quantity: predictedValue };
        });

        const totalPredictedValue = products.reduce((sum, p) => sum + p.predicted_average_quantity, 0);

        return {
            date: futureDate.toISOString(),
            predicted_value_of_orders: totalPredictedValue,
            products,
        };
    });

    return predictions;
};