import type { Repertoire } from '../types';

const ponziani: Repertoire = {
	id: 'ponziani',
	name: 'Ponziani Opening',
	color: 'white',
	description:
		'White plays 3.c3 after 1.e4 e5 2.Nf3 Nc6, preparing d4 to seize the centre. A starter tree — edit to match your own lines.',
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
