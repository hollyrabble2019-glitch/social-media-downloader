import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export class AudioExtractor {
  private static tempDir = tmpdir()

  static async extractAudio(videoUrl: string): Promise<Buffer> {
    const tempVideoPath = join(this.tempDir, `temp_video_${Date.now()}.mp4`)
    const tempAudioPath = join(this.tempDir, `temp_audio_${Date.now()}.mp3`)

    try {
      // Download video to temporary file
      const videoResponse = await fetch(videoUrl)
      if (!videoResponse.ok) {
        throw new Error('Failed to download video')
      }

      const videoBuffer = await videoResponse.arrayBuffer()
      await fs.writeFile(tempVideoPath, Buffer.from(videoBuffer))

      // Extract audio using ffmpeg
      await this.convertToAudio(tempVideoPath, tempAudioPath)

      // Read the extracted audio file
      const audioBuffer = await fs.readFile(tempAudioPath)

      // Clean up temporary files
      await this.cleanup([tempVideoPath, tempAudioPath])

      return audioBuffer
    } catch (error) {
      // Clean up on error
      await this.cleanup([tempVideoPath, tempAudioPath])
      throw error
    }
  }

  private static convertToAudio(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if ffmpeg is available
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        inputPath,
        '-q:a',
        '0',
        '-map',
        'a',
        '-y', // Overwrite output file
        outputPath,
      ])

      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`))
      })
    })
  }

  private static async cleanup(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file)
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to cleanup file ${file}:`, error)
      }
    }
  }

  // Fallback method that simulates audio extraction
  // In a real implementation, this would be replaced with actual audio processing
  static async simulateAudioExtraction(videoUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(videoUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch video')
      }

      // For demo purposes, return the video buffer
      // In production, this would be processed audio
      const buffer = await response.arrayBuffer()
      return Buffer.from(buffer)
    } catch (error) {
      throw new Error(`Audio extraction failed: ${error}`)
    }
  }
}
