<script lang="ts">
    import { differenceInYears } from 'date-fns/differenceInYears';

    const years: number = differenceInYears(new Date(), new Date("2009-07-01"));
</script>

<section class="py-2">
    <h2>what's all this?</h2>
    <p>I am Shane. This is my site! It's my space for ideas, art, creative coding, analysis, play, etc.</p>
    <p>I'm a professional software engineer with about {years} years of experience.</p>
</section>