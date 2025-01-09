export interface PredictionRequest {
    orders: number[];
    period: 'day' | 'month' | 'year';
    count: number;
}
