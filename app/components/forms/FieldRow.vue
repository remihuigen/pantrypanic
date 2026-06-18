<script lang="ts" setup></script>

<template>
	<div class="field-row flex flex-col items-start gap-3 sm:flex-row"><slot /></div>
</template>

<style>
.field-row > * {
	flex: 1;
}
</style>
