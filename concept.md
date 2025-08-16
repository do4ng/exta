```txt
/pages
  /index.svelte
  /$layout.svelte
  /posts/
    /[id].svelte
```

- index.svelte (basic concept)

```svelte
<script server>
  const res = await fetch("SOME_URL");

  export const data = await res.json();
</script>

<span>{data.message}</span>
```

- $layout.svelte

```svelte
<script>
	let { children } = $props();
</script>


<div>
  {@render children()}
</div>

```
