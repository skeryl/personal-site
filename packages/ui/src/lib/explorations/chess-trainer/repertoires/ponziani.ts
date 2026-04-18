import type { Repertoire } from '../types';

const ponziani: Repertoire = {
	id: 'ponziani',
	name: 'Ponziani Opening',
	aliases: ['Staunton Opening', 'English Attack (historical)'],
	ecoCode: 'C44',
	color: 'white',
	description:
		'White plays 3.c3 after 1.e4 e5 2.Nf3 Nc6, preparing d4 to seize the centre. A starter tree — edit to match your own lines.',
	historicalContext:
		'Named after Domenico Lorenzo Ponziani, an 18th-century Italian master whose 1769 treatise analysed the opening in depth. The move 3.c3 belongs to the old Italian school: rather than develop a piece, White spends a tempo to prepare an uncontested d2–d4 push. The opening faded from top-level play in the 20th century as defences for Black were refined, but remains a practical surprise weapon at club level.',
	strategicConcepts: [
		{
			concept: 'Pay tempo for the centre',
			explanation:
				"3.c3 is a non-developing move, so White is consciously 'buying' central control with time. The trade is only worth it if White follows up with an energetic d4. If the d4 push never comes, the move is simply slow."
		},
		{
			concept: 'Sidestep ...Bb4',
			explanation:
				'Unlike Italian Game lines with 3.Bc4 where Black can pin with ...Bb4+ or disrupt with ...Nd4, 3.c3 denies the b4-square to the dark-squared bishop. This small detail is why c3 is played before the bishop comes out.'
		},
		{
			concept: 'Kick the knight with d5',
			explanation:
				"When Black responds with 3...Nf6 4.d4 Nxe4, White's plan is the tempo-gaining 5.d5, driving the c6-knight to a passive square while preparing to recover the e4-pawn. The whole line hinges on this intermezzo."
		},
		{
			concept: 'Respect the Jaenisch (3...d5)',
			explanation:
				'Black can break centrally with 3...d5, attacking e4 and discouraging d4. The principled response is 4.Qa4 — the queen both pins the c6-knight and presses d5, exploiting the fact that Black has not yet developed.'
		}
	],
	root: [
		{
			san: 'e4',
			comment: 'Claim the centre.',
			children: [
				{
					san: 'e5',
					weight: 6,
					children: [
						{
							san: 'Nf3',
							comment: 'Develop and attack e5.',
							children: [
								{
									san: 'Nc6',
									weight: 6,
									children: [
										{
											san: 'c3',
											comment: 'The Ponziani — prepare d4 without allowing ...Bb4.',
											children: [
												{
													san: 'Nf6',
													weight: 4,
													comment: 'Most common — Black attacks e4.',
													children: [
														{
															san: 'd4',
															comment: 'Push through. If Nxe4, we kick with d5 gaining tempo.',
															children: [
																{
																	san: 'Nxe4',
																	weight: 3,
																	children: [
																		{
																			san: 'd5',
																			comment: 'Kick the knight from c6 with tempo.',
																			children: [
																				{
																					san: 'Ne7',
																					weight: 3,
																					children: [
																						{
																							san: 'Nxe5',
																							comment: 'Win the pawn back.'
																						}
																					]
																				},
																				{
																					san: 'Nb8',
																					weight: 2,
																					children: [
																						{
																							san: 'Bd3',
																							comment: 'Develop, attack the Ne4.'
																						}
																					]
																				}
																			]
																		}
																	]
																},
																{
																	san: 'exd4',
																	weight: 2,
																	children: [
																		{
																			san: 'e5',
																			comment: 'Push and gain space — the Nf6 must move.',
																			children: [
																				{
																					san: 'Nd5',
																					weight: 2,
																					children: [
																						{
																							san: 'Qxd4',
																							comment: 'Recapture, centralise the queen.'
																						}
																					]
																				},
																				{
																					san: 'Ne4',
																					weight: 1,
																					children: [
																						{
																							san: 'Qxd4',
																							comment: 'Recapture, threaten Qxe4.'
																						}
																					]
																				}
																			]
																		}
																	]
																},
																{
																	san: 'd6',
																	weight: 1,
																	children: [
																		{
																			san: 'dxe5',
																			comment: 'Open lines, Black must recapture awkwardly.'
																		}
																	]
																}
															]
														}
													]
												},
												{
													san: 'd5',
													weight: 3,
													comment: 'The Jaenisch — sharp counterattack.',
													children: [
														{
															san: 'Qa4',
															comment: 'Pin the knight and add pressure on d5.',
															children: [
																{
																	san: 'Nf6',
																	weight: 2,
																	children: [{ san: 'Nxe5', comment: 'Grab the pawn.' }]
																},
																{
																	san: 'dxe4',
																	weight: 2,
																	children: [
																		{ san: 'Nxe5', comment: 'Double attack — Qa4 hits c6.' }
																	]
																},
																{
																	san: 'f6',
																	weight: 1,
																	children: [
																		{ san: 'Bb5', comment: 'Pin — Black is already struggling.' }
																	]
																}
															]
														}
													]
												},
												{
													san: 'd6',
													weight: 2,
													comment: 'Passive — we get a free hand in the centre.',
													children: [
														{
															san: 'd4',
															children: [
																{
																	san: 'Nf6',
																	weight: 2,
																	children: [{ san: 'Bd3', comment: 'Simple development.' }]
																},
																{
																	san: 'Bg4',
																	weight: 1,
																	children: [
																		{
																			san: 'dxe5',
																			comment: 'Open the position before he develops.'
																		}
																	]
																}
															]
														}
													]
												},
												{
													san: 'f5',
													weight: 1,
													comment: 'Aggressive but weakening.',
													children: [
														{
															san: 'd4',
															comment:
																"Don't take on f5 — keep the centre and punish the weakness later.",
															children: [
																{
																	san: 'fxe4',
																	weight: 2,
																	children: [
																		{ san: 'Nxe5', comment: 'Equal material, better structure.' }
																	]
																}
															]
														}
													]
												},
												{
													san: 'Be7',
													weight: 1,
													comment: 'Passive — play for a classical centre.',
													children: [{ san: 'd4', comment: 'Build the ideal centre.' }]
												}
											]
										}
									]
								}
							]
						}
					]
				}
			]
		}
	]
};

export default ponziani;
