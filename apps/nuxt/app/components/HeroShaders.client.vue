<script setup lang="ts">
import Pixelate from '#shaders-vue/Pixelate.js'
import Plasma from '#shaders-vue/Plasma.js'
import Shader from '#shaders-vue/Shader.js'
import SineWave from '#shaders-vue/SineWave.js'

const colorMode = useColorMode()
</script>

<template>
	<Shader>
		<Pixelate
			:gap="{
				type: 'map',
				curve: 0.35,
				source: 'idmmbhthud5inxgebqc',
				channel: 'alphaInverted',
				inputMax: 1,
				inputMin: 0,
				outputMax: 1,
				outputMin: 0.16
			}"
			:roundness="0.2"
			:scale="68"
			:transform="{ rotation: 180 }"
		>
			<Plasma
				:balance="57"
				color-a="#eb533a"
				:color-b="colorMode.value === 'dark' ? '#090b0c' : '#f9fbfb'"
				:contrast="colorMode.value === 'dark' ? 1.6 : 1.4"
				:density="3.3"
				:intensity="1.8"
				:visible="true"
			/>
		</Pixelate>
		<SineWave
			id="idmmbhthud5inxgebqc"
			:amplitude="0.1"
			:position="{
				x: 0.5,
				y: 1
			}"
			:softness="0.8"
			:thickness="0.7"
			:visible="false"
		/>
	</Shader>
</template>
