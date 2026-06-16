<template>
	<div class="fluid">
		<slot />
	</div>
</template>

<style>
.fluid {
	position: relative;
	width: 100vw;
	max-width: none;
	margin-left: -50vw;
	left: 50%;
}
</style>
