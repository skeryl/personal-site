<script>
    import NavLink from "./NavLink.svelte";
</script>

<nav class="w-full h-12 px-6 max-sm:px-3 flex flex-row content-between items-center sticky top-0 bg-surface">
    <div class="flex flex-1">
        <NavLink href="/" text="shane's computer"/>
    </div>
    <div class="flex flex-1 justify-end">
        <!--<NavLink href="/journal" text="journal"/>-->
        <NavLink href="/about" text="about" className="content-end"/>
    </div>
</nav>