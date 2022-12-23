<script lang="ts">
	import courses from 'src/data/courses';

	let query = '';

	let focused = false;

	$: filtered = courses.filter((course) => course.toLowerCase().includes(query.toLowerCase()));
</script>

<nav class="bg-[rgb(0,0,30)] p-2 py-3 grid grid-cols-3 px-10 text-white border-b border-gray-900">
	<h1 class="my-auto">IMSA Grades</h1>
	<div class="w-full relative">
		<input
			type="text"
			class="w-full py-1 px-2 rounded-sm text-black"
			on:focus={() => (focused = true)}
			on:blur={() => (focused = false)}
			bind:value={query}
			placeholder="Search..."
		/>
		<div
			class="absolute origin-top bg-gray-100 transition-all shadow-xl border-gray-200 border rounded-md w-full top-10 max-h-[400px] overflow-auto {focused
				? ''
				: 'scale-95 opacity-0 pointer-events-none'}"
		>
			<ul class="divide-y divide-gray-200 px-2  text-gray-500">
				{#each filtered as course}
					<li>
						<a class="search-link" href="https://apple.com"> {course}</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
	<div class="flex justify-end items-center">About</div>
</nav>
