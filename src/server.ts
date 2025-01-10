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
        const requestData = req.body;

        // Проверяем наличие topdata
        if (!requestData || !Array.isArray(requestData) || !requestData[0]?.topdata) {
            return res.status(400).json({ error: 'Invalid input structure: topdata missing' });
        }

        const { orders, query } = requestData[0].topdata;

        if (!orders || !query || orders.length === 0 || query.length === 0) {
            return res.status(400).json({ error: 'Orders or query is missing or empty' });
        }

        // @ts-ignore
        const flattenedOrders = orders.flatMap(orderGroup => orderGroup.data);

        // Проверка и обработка поля query
        let parsedQuery;
        try {
            // Попытка распарсить строку как JSON
            parsedQuery = JSON.parse(query[0].query);
        } catch (e) {
            // Если строка не JSON, предполагаем альтернативный формат и парсим вручную
            console.warn('Attempting to process query as alternate format:', query[0].query);
            const altQueryRegex = /prediction_type - (\w+), quantity - (\d+)/;
            const match = query[0].query.match(altQueryRegex);
            if (match) {
                parsedQuery = {
                    prediction_type: match[1],
                    quantity: parseInt(match[2], 10)
                };
            } else {
                // Если не удалось обработать строку, возвращаем ошибку
                console.error('Invalid query format:', query[0].query);
                return res.status(400).json({ error: 'Invalid query format. Expected JSON string or alternate format.' });
            }
        }

        if (!parsedQuery.prediction_type || !parsedQuery.quantity || parsedQuery.quantity <= 0) {
            return res.status(400).json({ error: 'Invalid query parameters' });
        }

        const { predictions, products } = predictOrdersWithStats(flattenedOrders, parsedQuery.prediction_type, parsedQuery.quantity);

        return res.status(200).json({
            predictions: predictions.map((value, index) => {
                const futureDate = new Date();
                switch (parsedQuery.prediction_type) {
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
                    period: parsedQuery.prediction_type,
                    type: 'orders',
                    products,
                };
            }),
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
