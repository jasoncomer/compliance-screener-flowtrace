import { Request, Response } from 'express';
import { RiskScoringService } from '@src/services/riskScoring.service';

interface RiskScoringRequest {
  identifier: string;
  type: 'address' | 'transaction';
}

const riskScoringService = new RiskScoringService();

export const calculateRiskScore = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { identifier, type } = req.body as RiskScoringRequest;

    if (!identifier || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: identifier and type',
      });
    }

    if (!['address', 'transaction'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be either "address" or "transaction"',
      });
    }

    console.log('Calculating risk score for:', identifier, 'of type:', type);
    const riskScores = await riskScoringService.calculateRiskScore(identifier, type);

    return res.status(200).json({
      success: true,
      data: riskScores,
    });
  } catch (error) {
    console.error('Error calculating risk score:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
