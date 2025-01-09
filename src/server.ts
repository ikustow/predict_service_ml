import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { predictOrdersWithStats } from './services/predictionService';
import { PredictionRequest } from './models/PredictionRequest';
import { OrderData, QueryData } from './models/OrderData';

const app = express();
const port = 3000;

// Middleware for JSON parsing
app.use(bodyParser.json());

// Endpoint for predictions
// @ts-ignore
app.post('/predict', async (req: Request, res: Response) => {
    try {
        const [ordersPayload, queryPayload] = req.body;
        const { data: orders }: { data: OrderData[] } = ordersPayload;
        const query: QueryData = JSON.parse(queryPayload.query);

        // Validate input
        if (!orders || !query.prediction_type || !query.quantity || query.quantity <= 0) {
            return res.status(400).json({ error: 'Invalid input parameters' });
        }

        // Perform prediction using Simple-statistics
        const { predictions, products } = predictOrdersWithStats(orders, query.prediction_type, query.quantity);

        return res.status(200).json({
            predictions: predictions.map((value, index) => {
                const futureDate = new Date();
                switch (query.prediction_type) {
                    case 'day':
                        futureDate.setDate(futureDate.getDate() + index + 1);
                        break;
                    case 'month':
                        futureDate.setMonth(futureDate.getMonth() + index + 1);
                        break;
                    case 'year':
                        futureDate.setFullYear(futureDate.getFullYear() + index + 1);
                        break;
                }

                return {
                    date: futureDate.toISOString(),
                    predicted_value: value,
                    period: query.prediction_type,
                    type: 'orders',
                    products
                };
            })
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// Test endpoint to check service health
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Service is running' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});