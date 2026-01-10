import { Router } from 'express';
import type { Request } from 'express';
import { customInstructionsRepository } from '../../db/repositories/custom-instructions.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { validateBody } from '../middlewares/validation.js';
import {
  customInstructionCreateSchema,
  customInstructionUpdateSchema,
  type CustomInstructionCreate,
  type CustomInstructionUpdate,
} from '../validators/schemas.js';

export const customInstructionsRouter = Router();

const NOT_FOUND_ERROR = { error: { message: 'Custom instruction not found' } };

function parseId(req: Request): number {
  return parseInt(req.params.id, 10);
}

customInstructionsRouter.get(
  '/',
  asyncHandler((_req, res) => {
    const instructions = customInstructionsRepository.findAll();
    res.json({ data: instructions });
  })
);

customInstructionsRouter.get(
  '/:id',
  asyncHandler((req, res) => {
    const instruction = customInstructionsRepository.findById(parseId(req));

    if (!instruction) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(instruction);
  })
);

customInstructionsRouter.post(
  '/',
  validateBody(customInstructionCreateSchema),
  asyncHandler((req, res) => {
    const data = req.body as CustomInstructionCreate;
    const instruction = customInstructionsRepository.create(data);
    res.status(201).json(instruction);
  })
);

customInstructionsRouter.put(
  '/:id',
  validateBody(customInstructionUpdateSchema),
  asyncHandler((req, res) => {
    const data = req.body as CustomInstructionUpdate;
    const instruction = customInstructionsRepository.update(parseId(req), data);

    if (!instruction) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(instruction);
  })
);

customInstructionsRouter.delete(
  '/:id',
  asyncHandler((req, res) => {
    const deleted = customInstructionsRepository.delete(parseId(req));

    if (!deleted) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.status(204).send();
  })
);

customInstructionsRouter.patch(
  '/:id/toggle',
  asyncHandler((req, res) => {
    const instruction = customInstructionsRepository.toggleActive(parseId(req));

    if (!instruction) {
      res.status(404).json(NOT_FOUND_ERROR);
      return;
    }

    res.json(instruction);
  })
);
