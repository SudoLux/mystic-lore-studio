import type {
  EditorialBlockType,
  EditorialJsonValue,
  EditorialNarrativeRole,
  EditorialSceneType,
} from '../types/editorial';

export type EditorialStarterBlock = {
  content: EditorialJsonValue;
  settings?: Record<string, EditorialJsonValue>;
  type: EditorialBlockType;
};

export type EditorialSceneBlueprint = {
  blocks: EditorialStarterBlock[];
  description?: string;
  narrativeRole: EditorialNarrativeRole;
  sceneType: EditorialSceneType;
  subtitle?: string;
  title: string;
};

export const editorialTemplateBlueprints = {
  'blank-collection': [
    scene('Cover', 'cover', 'introduction'),
  ],
  campaign: [
    scene('Cover', 'cover', 'introduction', [
      paragraph('A campaign world built around one garment, one attitude, and one memorable visual signal.'),
    ], 'Campaign title frame', 'Set the campaign tone with the strongest project image.'),
    scene('Campaign Direction', 'story', 'context', [
      heading('Define the world', 'Art Direction'),
      paragraph('Describe the mood, location, light, movement, and cultural references that shape this campaign.'),
      callout('Campaign signal', 'Name the one feeling the audience should remember after seeing the campaign.'),
    ], 'Mood, audience, and visual language'),
    scene('Hero Story', 'gallery', 'highlight', [
      callout('Hero frame', 'Lead with the image that communicates the garment before any explanation is needed.'),
    ], 'The defining campaign image'),
    scene('Look One', 'gallery', 'development', [
      heading('The first expression', 'Styling Direction'),
      paragraph('Note the silhouette, styling choices, pose, and environment used to introduce the campaign look.'),
    ], 'Primary styling and silhouette'),
    scene('Detail Frames', 'gallery', 'development', [
      paragraph('Use close frames to reveal texture, construction, hardware, and the small choices that reward attention.'),
    ], 'Texture, finish, and product details'),
    scene('Channel Notes', 'technical', 'resolution', [
      heading('Campaign delivery', 'Publishing Plan'),
      paragraph('Record the intended crops, formats, launch sequence, and any channel-specific presentation notes.'),
      divider('Ready for release'),
    ], 'Formats, crops, and rollout'),
    scene('Credits', 'closing', 'closing', [
      heading('Made by many hands', 'Credits'),
      paragraph('Add creative direction, photography, styling, talent, beauty, production, and location credits.'),
    ], 'Creative team and acknowledgements'),
  ],
  'client-presentation': [
    scene('Cover', 'cover', 'introduction', [
      paragraph('A focused presentation prepared for clear review, alignment, and approval.'),
    ], 'Client presentation'),
    scene('Project Brief', 'story', 'context', [
      heading('What we are solving', 'Project Brief'),
      paragraph('Summarize the client need, intended wearer, occasion, practical requirements, and desired outcome.'),
      callout('Success measure', 'State the clearest signal that this project has met the brief.'),
    ], 'Purpose, wearer, and desired outcome'),
    scene('Design Direction', 'story', 'development', [
      heading('Proposed direction', 'Design Strategy'),
      paragraph('Explain the silhouette, proportion, palette, and signature details in direct client-friendly language.'),
      quote('Add the short phrase that captures the approved design direction.', 'Client or creative lead'),
    ], 'Silhouette, palette, and design intent'),
    scene('Materials', 'fabric-story', 'supporting', [
      heading('Material recommendation', 'Textile Direction'),
      paragraph('Describe why the selected textiles support comfort, durability, movement, and the intended finish.'),
    ], 'Recommended textiles and rationale'),
    scene('Proposed Looks', 'gallery', 'highlight', [
      callout('Review point', 'Use this scene to compare the strongest visual options and identify the preferred direction.'),
    ], 'Visual options for review'),
    scene('Timeline & Deliverables', 'technical', 'resolution', [
      heading('Path to completion', 'Schedule'),
      paragraph('Outline fittings, review moments, production milestones, deliverables, and target dates.'),
      divider('Decision checkpoint'),
    ], 'Milestones and delivery plan'),
    scene('Approval', 'closing', 'closing', [
      heading('Ready for the next step', 'Approval'),
      paragraph('Record the selected direction, requested revisions, decision owner, and the next scheduled action.'),
      callout('Client action', 'Confirm approval or list the specific decisions still required.', 'note'),
    ], 'Decision and next action'),
  ],
  'collection-lookbook': [
    scene('Cover', 'cover', 'introduction', [
      paragraph('A considered collection presented as one connected visual language.'),
    ], 'Collection title and season'),
    scene('Collection Statement', 'story', 'context', [
      heading('The collection in one breath', 'Collection Statement'),
      paragraph('Describe the central idea, emotional register, and point of view that connects every look.'),
      divider(),
      quote('Add a phrase that could live beside the collection title.', 'Collection voice'),
    ], 'The idea connecting every look'),
    scene('The Lineup', 'gallery', 'development', [
      callout('Sequence note', 'Arrange imagery so silhouette, color, and proportion build a deliberate rhythm from look to look.'),
    ], 'The complete collection at a glance'),
    scene('Signature Looks', 'gallery', 'highlight', [
      heading('The looks that carry the thesis', 'Key Looks'),
      paragraph('Use the strongest images and note what makes each selected look essential to the collection.'),
    ], 'Hero garments and defining silhouettes'),
    scene('Styling Notes', 'story', 'supporting', [
      heading('How the collection lives', 'Styling'),
      paragraph('Record layering, footwear, accessories, casting, grooming, and movement notes that unify the presentation.'),
      callout('Continuity', 'Identify one styling rule that should remain consistent across every look.', 'note'),
    ], 'Continuity across the lineup'),
    scene('Detail Study', 'gallery', 'resolution', [
      paragraph('Close in on finish, closures, texture, interior work, and construction details that distinguish the collection.'),
    ], 'Craft and finish in close view'),
    scene('Credits', 'closing', 'closing', [
      heading('Collection credits', 'Acknowledgements'),
      paragraph('Add design, construction, photography, styling, talent, and production credits.'),
    ], 'The people behind the collection'),
  ],
  'design-journey': [
    scene('Cover', 'cover', 'introduction', [
      paragraph('From first instinct to final garment: a record of choices, experiments, and refinement.'),
    ], 'A process-led garment story'),
    scene('Concept', 'story', 'context', [
      heading('The first question', 'Concept'),
      paragraph('Describe the original impulse, problem, reference, or wearer need that began the project.'),
      callout('Starting point', 'What did you want to discover through making this garment?'),
    ], 'The idea that started the work'),
    scene('Research', 'story', 'development', [
      heading('References and discoveries', 'Research'),
      paragraph('Capture visual research, historical references, construction precedents, and insights that redirected the design.'),
      quote('Add a research insight that changed the project.', 'Studio notes'),
    ], 'What informed the direction'),
    scene('Materials', 'fabric-story', 'supporting', [
      heading('Choosing the cloth', 'Material Study'),
      paragraph('Explain how hand, weight, drape, structure, and color influenced the evolving design.'),
    ], 'Textile tests and material decisions'),
    scene('Development', 'construction', 'development', [
      heading('Learning through making', 'Development'),
      paragraph('Document pattern trials, samples, construction tests, and the decisions produced by each iteration.'),
      divider('Iteration'),
    ], 'Patterns, samples, and revisions'),
    scene('Fitting', 'construction', 'highlight', [
      heading('Fit becomes form', 'Fitting'),
      paragraph('Record balance, proportion, mobility, comfort, and the revisions made after seeing the garment on a body.'),
      callout('Key revision', 'Name the fitting change that most improved the garment.', 'note'),
    ], 'Proportion, movement, and correction'),
    scene('Final Garment', 'gallery', 'resolution', [
      paragraph('Present the completed garment with enough distance to read the silhouette and enough detail to see the craft.'),
    ], 'The resolved design'),
    scene('Reflection', 'closing', 'closing', [
      heading('What the garment taught', 'Reflection'),
      paragraph('Reflect on what succeeded, what remains unresolved, and what you would carry into the next project.'),
    ], 'Lessons from the process'),
  ],
  'fashion-editorial': [
    scene('Cover', 'cover', 'introduction', [
      paragraph('A garment story shaped through atmosphere, attitude, and image.'),
    ], 'Editorial title frame'),
    scene('Inspiration', 'story', 'context', [
      heading('Where the story begins', 'Inspiration'),
      paragraph('Describe the image, memory, place, sound, or cultural reference that sets the emotional temperature.'),
      quote('Add one line that captures the spirit of the garment.', 'Editorial voice'),
    ], 'Mood, memory, and visual references'),
    scene('Materials', 'fabric-story', 'supporting', [
      heading('Cloth as character', 'Material Story'),
      paragraph('Write about the hand, weight, color, and movement of the materials as part of the editorial narrative.'),
    ], 'Texture, color, and movement'),
    scene('Construction', 'construction', 'development', [
      heading('The making leaves a trace', 'Construction'),
      paragraph('Highlight the pattern decisions, handwork, internal structure, or finishing that gives the garment its identity.'),
      divider('From studio to image'),
    ], 'Craft behind the silhouette'),
    scene('Final Editorial', 'gallery', 'highlight', [
      callout('Editorial focus', 'Choose images that reveal attitude and silhouette before explaining details.'),
    ], 'The garment in its finished world'),
    scene('Details', 'gallery', 'resolution', [
      heading('What rewards a closer look', 'Detail Study'),
      paragraph('Use close imagery to reveal closures, texture, seams, lining, and intentional irregularities.'),
    ], 'Close frames and signature details'),
    scene('Reflection', 'closing', 'closing', [
      heading('After the final frame', 'Reflection'),
      paragraph('Close with what this garment expresses now and where its story might travel next.'),
    ], 'A final note from the studio'),
  ],
  'technical-presentation': [
    scene('Cover', 'cover', 'introduction', [
      paragraph('A precise record of design intent, construction logic, fit, and final specification.'),
    ], 'Technical garment presentation'),
    scene('Design Overview', 'technical', 'context', [
      heading('Design objective', 'Overview'),
      paragraph('State the garment function, intended wearer, silhouette, fit target, and primary performance requirements.'),
      callout('Technical priority', 'Identify the requirement that cannot be compromised.'),
    ], 'Function, silhouette, and requirements'),
    scene('Materials', 'fabric-story', 'supporting', [
      heading('Material specification', 'Textiles'),
      paragraph('Record shell, lining, interfacing, trim, weight, stretch, width, and any preparation requirements.'),
    ], 'Fabric and component specifications'),
    scene('Pattern & Construction', 'construction', 'development', [
      heading('Assembly logic', 'Construction'),
      paragraph('Document pattern components, seam strategy, reinforcement, order of operations, and specialized techniques.'),
      divider('Construction checkpoint'),
    ], 'Pattern pieces and build sequence'),
    scene('Specifications', 'technical', 'highlight', [
      heading('Key measurements', 'Specifications'),
      paragraph('Add finished measurements, tolerances, grading notes, and the points of measure required for review.'),
      callout('Tolerance note', 'Flag any measurement where a small variance significantly changes fit.', 'warning'),
    ], 'Measurements, tolerances, and details'),
    scene('Fit Notes', 'technical', 'resolution', [
      heading('Fit evaluation', 'Fitting'),
      paragraph('Record balance, ease, mobility, drag lines, wearer feedback, and the correction required at each fitting.'),
    ], 'Fit findings and corrections'),
    scene('Final Build', 'closing', 'closing', [
      heading('Production-ready summary', 'Final Build'),
      paragraph('Confirm approved materials, final pattern status, unresolved risks, care requirements, and next production action.'),
      divider('Approved standard'),
    ], 'Final status and production handoff'),
  ],
} satisfies Record<string, EditorialSceneBlueprint[]>;

function scene(
  title: string,
  sceneType: EditorialSceneType,
  narrativeRole: EditorialNarrativeRole,
  blocks: EditorialStarterBlock[] = [],
  subtitle = '',
  description = '',
): EditorialSceneBlueprint {
  return { blocks, description, narrativeRole, sceneType, subtitle, title };
}

function heading(text: string, eyebrow = ''): EditorialStarterBlock {
  return { content: { align: 'left', eyebrow, level: 2, text }, type: 'heading' };
}

function paragraph(text: string): EditorialStarterBlock {
  return { content: { align: 'left', text }, type: 'paragraph' };
}

function quote(text: string, attribution = ''): EditorialStarterBlock {
  return { content: { attribution, text }, type: 'quote' };
}

function callout(title: string, body: string, tone: 'highlight' | 'note' | 'warning' = 'highlight'): EditorialStarterBlock {
  return { content: { body, title, tone }, type: 'callout' };
}

function divider(label = ''): EditorialStarterBlock {
  return { content: { label, style: 'gradient' }, type: 'divider' };
}
