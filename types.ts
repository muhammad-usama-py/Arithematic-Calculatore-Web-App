export type RationalLike = {
  numerator: bigint;
  denominator: bigint;
};

export type Provenance = {
  source: 'user' | 'calc' | 'import';
  expr?: ExpressionNode;
  roundedDigits?: number | null;
  userModified?: boolean;
  timestamp?: string;
};

export type Value = {
  id: string;
  exact: RationalLike; // exact rational representation
  display: string; // formatted display string
  provenance: Provenance;
};

export type ExpressionNode =
  | { type: 'literal'; raw: string; value: RationalLike; source: 'user' | 'calc' | 'import' }
  | { type: 'binary'; op: '+' | '-' | '*' | '/'; left: ExpressionNode; right: ExpressionNode };
