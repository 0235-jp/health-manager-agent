import { Router } from 'express';
import { healthDataTimeseriesRepository } from '../../db/repositories/health-data-timeseries.js';
import { asyncHandler } from '../middlewares/async-handler.js';

export const healthDataTimeseriesRouter = Router();

const DEFAULT_LIMIT = 1000;
const DEFAULT_OFFSET = 0;

healthDataTimeseriesRouter.get(
  '/',
  asyncHandler((req, res) => {
    const {
      data_type,
      source,
      start_time,
      end_time,
      period_date,
      limit = DEFAULT_LIMIT,
      offset = DEFAULT_OFFSET,
    } = req.query;

    const result = healthDataTimeseriesRepository.findAll({
      data_type: data_type as string | undefined,
      source: source as string | undefined,
      start_time: start_time as string | undefined,
      end_time: end_time as string | undefined,
      period_date: period_date as string | undefined,
      limit: parseInt(limit as string, 10) || DEFAULT_LIMIT,
      offset: parseInt(offset as string, 10) || DEFAULT_OFFSET,
    });

    res.json(result);
  })
);

healthDataTimeseriesRouter.get(
  '/aggregate',
  asyncHandler((req, res) => {
    const { data_type, start_time, end_time, source } = req.query;

    if (!data_type || !start_time || !end_time) {
      res.status(400).json({
        error: { message: 'data_type, start_time, and end_time are required' },
      });
      return;
    }

    const result = healthDataTimeseriesRepository.aggregate(
      data_type as string,
      start_time as string,
      end_time as string,
      source as string | undefined
    );

    res.json(result);
  })
);

healthDataTimeseriesRouter.get(
  '/resample',
  asyncHandler((req, res) => {
    const { data_type, start_time, end_time, interval_minutes, source } = req.query;

    if (!data_type || !start_time || !end_time || !interval_minutes) {
      res.status(400).json({
        error: { message: 'data_type, start_time, end_time, and interval_minutes are required' },
      });
      return;
    }

    const result = healthDataTimeseriesRepository.resample(
      data_type as string,
      start_time as string,
      end_time as string,
      parseInt(interval_minutes as string, 10),
      source as string | undefined
    );

    res.json(result);
  })
);

healthDataTimeseriesRouter.get(
  '/data-types',
  asyncHandler((_req, res) => {
    const dataTypes = healthDataTimeseriesRepository.getDataTypes();
    res.json(dataTypes);
  })
);
