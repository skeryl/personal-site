<script lang="ts">
	import Icon from '$lib/components/icons/Icon.svelte';
	import CalcBuilder from './CalcBuilder.svelte';

	let expanded = $state(false);

	/* Lock the article scroll while the stage owns the viewport. */
	$effect(() => {
		if (!expanded) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});

	const onKeydown = (e: KeyboardEvent) => {
		if (e.key !== 'Escape' || !expanded) return;
		// A slot popover gets first claim on Escape.
		if (document.querySelector('[data-slot-menu]')) return;
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		expanded = false;
	};
</script>

<svelte:window onkeydown={onKeydown} />

<div class="demo-stage" class:expanded data-demo-stage>
	<div class="stage-bar">
		<span class="stage-title"><span class="calc-mark">ƒ</span> calc builder</span>
		<span class="stage-hint">
			{expanded ? 'Esc to return to the article' : 'live demo; expand for the full tool'}
		</span>
		<button class="stage-toggle" data-expand-demo onclick={() => (expanded = !expanded)}>
			<Icon
				type={expanded ? 'arrows-minimize' : 'arrows-maximize'}
				size="xs"
				className="!text-inherit hover:!text-inherit"
			/>
			{expanded ? 'Close' : 'Expand'}
		</button>
	</div>
	<div class="stage-body">
		<CalcBuilder />
	</div>
</div>

<style>
	.demo-stage {
		border: 1px solid var(--color-border-strong);
		border-radius: 0.75rem;
		background: var(--color-bg);
		/* clip (not hidden): a scroll container here would swallow the
		   palette's page-level sticky positioning. */
		overflow: clip;
	}
	.demo-stage.expanded {
		position: fixed;
		inset: 0;
		z-index: 60;
		border: none;
		border-radius: 0;
		display: flex;
		flex-direction: column;
	}
	.stage-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.9rem;
		border-bottom: 1px solid var(--color-border-subtle);
		background: var(--color-surface);
	}
	.stage-title {
		font-weight: 700;
		font-size: 0.85rem;
		color: var(--color-text-strong);
	}
	.calc-mark {
		font-style: italic;
		color: var(--cb-accent, #0ea5e9);
	}
	.stage-hint {
		flex: 1;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
	.stage-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
		padding: 0.3rem 0.6rem;
		border: 1px solid var(--color-border-strong);
		border-radius: 0.375rem;
		background: none;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.stage-toggle:hover {
		background: var(--color-surface-active);
	}
	.stage-body {
		overflow: visible;
	}
	.demo-stage.expanded .stage-body {
		flex: 1;
		overflow: auto;
		container-type: size;
	}
</style>
